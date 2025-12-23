<?php

namespace Vempain\VempainWebsite\Application\Dto;

final class PagedResponse
{
    /** @var array<int, array<string, mixed>> */
    public array $content;
    public int $page;
    public int $size;
    public int $totalElements;
    public int $totalPages;
    public bool $first;
    public bool $last;
    public bool $empty;

    /**
     * @param array<int, array<string, mixed>> $content
     */
    public function __construct(array $content, int $page, int $size, int $totalElements)
    {
        $this->content = $content;
        $this->page = $page;
        $this->size = $size;
        $this->totalElements = $totalElements;
        $this->totalPages = $size > 0 ? (int)ceil($totalElements / $size) : 0;
        $this->first = $page <= 0;
        $this->last = $this->totalPages === 0 ? true : ($page >= $this->totalPages - 1);
        $this->empty = $totalElements === 0;
    }

    public function toArray(): array
    {
        return [
            'content' => $this->content,
            'page' => $this->page,
            'size' => $this->size,
            'total_elements' => $this->totalElements,
            'total_pages' => $this->totalPages,
            'first' => $this->first,
            'last' => $this->last,
            'empty' => $this->empty,
        ];
    }
}

